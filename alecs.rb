class Alecs < Formula
  desc "ALECS - A Launchgrid for Edge & Cloud Services - MCP server for Akamai"
  homepage "https://github.com/acedergren/alecs-mcp-server-akamai"
  url "https://registry.npmjs.org/alecs-mcp-server-akamai/-/alecs-mcp-server-akamai-1.7.4.tgz"
  sha256 "PLACEHOLDER_SHA256"
  license "AGPL-3.0-or-later"
  
  depends_on "node"
  
  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
    
    # Install additional scripts
    (libexec/"scripts").install Dir["scripts/install-*.sh"]
    (libexec/"scripts").install Dir["scripts/generate-*.js"]
    
    # Make scripts executable
    chmod 0755, Dir["#{libexec}/scripts/install-*.sh"]
    chmod 0755, Dir["#{libexec}/scripts/generate-*.js"]
  end
  
  def post_install
    # Create symlinks for installation scripts
    bin.install_symlink "#{libexec}/scripts/install-claude-desktop.sh" => "alecs-install-claude-desktop"
    bin.install_symlink "#{libexec}/scripts/install-cursor.sh" => "alecs-install-cursor"
    bin.install_symlink "#{libexec}/scripts/install-lmstudio.sh" => "alecs-install-lmstudio"
    bin.install_symlink "#{libexec}/scripts/install-vscode.sh" => "alecs-install-vscode"
    bin.install_symlink "#{libexec}/scripts/install-windsurf.sh" => "alecs-install-windsurf"
    bin.install_symlink "#{libexec}/scripts/install-claude-code-mcp.sh" => "alecs-install-claude-code"
    bin.install_symlink "#{libexec}/scripts/generate-cursor-button.js" => "alecs-generate-cursor-button"
    bin.install_symlink "#{libexec}/scripts/generate-lmstudio-button.js" => "alecs-generate-lmstudio-button"
  end
  
  def caveats
    <<~EOS
      ALECS MCP Server has been installed successfully!
      
      To get started:
      1. Configure your Akamai credentials in ~/.edgerc
      2. Install ALECS in your favorite AI client:
         
         • Claude Desktop:    alecs-install-claude-desktop
         • Cursor IDE:        alecs-install-cursor
         • LM Studio:         alecs-install-lmstudio
         • VS Code:           alecs-install-vscode
         • Windsurf:          alecs-install-windsurf
         • Claude Code:       alecs-install-claude-code
      
      3. Start using ALECS:
         alecs --help
      
      For more information, visit:
      https://github.com/acedergren/alecs-mcp-server-akamai
    EOS
  end
  
  test do
    system "#{bin}/alecs", "--version"
    assert_predicate bin/"alecs-akamai", :exist?
    assert_predicate bin/"alecs", :exist?
  end
end